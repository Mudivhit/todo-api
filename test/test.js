const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const expect = chai.expect;

chai.use(chaiHttp);

describe('Tasks API', () => {
  let token;
  beforeEach((done) => {
    done();
  });

  // Signup test
  it('should register a new user', (done) => {
    const user = {
      username: 'testuser',
      password: 'testpassword',
    };

    chai
      .request(app)
      .post('/register')
      .send(user)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equal('User registered successfully');
        done();
      });
  });

  // Login test
  it('should login a user and receive a token', (done) => {
    const user = {
      username: 'testuser',
      password: 'testpassword',
    };

    chai
      .request(app)
      .post('/login')
      .send(user)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.token).to.be.a('string');
        token = res.body.token;
        done();
      });
  });

  // Create task test
  it('should create a new task', (done) => {
    const task = {
      title: 'New Task',
      description: 'This is a new task.',
      completed: false,
    };

    chai
      .request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send(task)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.id).to.be.a('number');
        done();
      });
  });

  // Edit task test
  it('should update an existing task', (done) => {
    const updatedTask = {
      title: 'Updated Task',
      description: 'This task has been updated.',
      completed: true,
    };

    chai
      .request(app)
      .put('/tasks/1')
      .set('Authorization', `Bearer ${token}`)
      .send(updatedTask)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.changes).to.equal(1);
        done();
      });
  });

  // Delete task test
  it('should delete an existing task', (done) => {
    chai
      .request(app)
      .delete('/tasks/1')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.deleted).to.equal(1);
        done();
      });
  });
});
